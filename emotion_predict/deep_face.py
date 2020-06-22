import requests
import json
import csv
import cv2
import os
import time
import sys

#deep_face api 적용
from deepface import DeepFace
from deepface.extendedmodels import Age, Gender, Race, Emotion

#파일 경로 (csv 파일 저장)
testurl="./"

#CSV파일 만들기
def toCSV(emotion_list,username):
    file = open(testurl+'%s.csv' % username, 'w', encoding='utf-8', newline='')
    csvfile = csv.writer(file)
    header_list=['Time(second)','anger','disgust','fear','happiness','sad','surprise','neutral']
    csvfile.writerow(header_list)
    for row in emotion_list :
        csvfile.writerow(row)
    file.close()

#PI차트 데이터
emotion_cnt=[0,0,0,0,0,0,0]

def pi_graph_dataset(emotion):
    if(emotion=="happy"):
        emotion_cnt[0]+=1
    elif(emotion=="neutral"):
        emotion_cnt[1]+=1
    elif(emotion=="angry"):
        emotion_cnt[2]+=1
    elif(emotion=="disgust"):
        emotion_cnt[3]+=1
    elif(emotion=="fear"):
        emotion_cnt[4]+=1
    elif(emotion=="sad"):
        emotion_cnt[5]+=1
    elif(emotion=="surprise"):
        emotion_cnt[6]+=1

#PI차트 그리기
import matplotlib.pyplot as plt

def make_graph():
    plt.rcParams['figure.figsize'] = [12, 8]
    group_names = ['Positive', 'Negative']
    group_sizes = [emotion_cnt[0]+emotion_cnt[1],emotion_cnt[2]+emotion_cnt[3]+emotion_cnt[4]+emotion_cnt[5]+emotion_cnt[6]]

    subgroup_names = ['happy','neutral','anger','disgust','fear','sad','surprise']
    subgroup_sizes = [emotion_cnt[0],emotion_cnt[1],emotion_cnt[2],emotion_cnt[3],emotion_cnt[4],emotion_cnt[5],emotion_cnt[6]]

    a, b = [plt.cm.Greens,plt.cm.Reds]

    width_num = 0.4
    fig, ax = plt.subplots()

    ax.axis('equal')

    pie_outside, _ = ax.pie(group_sizes,radius=1.3,labels=group_names, 
                            labeldistance=0.8,colors=[a(0.7), b(0.7)])

    plt.setp(pie_outside,width=width_num,edgecolor='white')

# Inside Ring

    pie_inside, plt_labels, junk = \
        ax.pie(subgroup_sizes, 
            radius=(1.3 - width_num), 
            labels=subgroup_names, 
            labeldistance=0.75, 
            autopct='%1.1f%%',
            colors=[a(0.5), a(0.4), b(0.6), b(0.5), 
                    b(0.4), b(0.3), b(0.2)])

    plt.setp(pie_inside,
         width=width_num, edgecolor='white')
    plt.title('Emotion Analyze', fontsize=20)
    plt.savefig(testurl+'emo_graph.png')

#로그 데이터 만들기
emotion_log_list=[]

def log_judge(emotionlist):
    for i in emotionlist:
        if(i >= 80):
            return True
    return False


#모델 로드
models = {}
models["emotion"] = Emotion.loadModel()
models["age"] = Age.loadModel()
models["gender"] = Gender.loadModel()
models["race"] = Race.loadModel()


# 영상의 의미지를 연속적으로 캡쳐할 수 있게 하는 class
vidcap = cv2.VideoCapture(testurl+'video.mp4')
count = 1

emotion_list=[]

while(vidcap.isOpened()):
    ret, image = vidcap.read()
    if(int(vidcap.get(1)) % vidcap.get(cv2.CAP_PROP_FPS)  == 0):
        # cv2.imwrite("./frame_image/frame%d.jpg" % count, image)
        # image_data = open("./frame_image/frame%d.jpg" % count, "rb")
        try:
            emotion=DeepFace.analyze(image, models=models)
        except:
            print("error")
            count+=1    
        pi_graph_dataset(emotion["dominant_emotion"])
        emlist=list(emotion['emotion'].values())
        emlist.insert(0,count)
        if(log_judge(emlist)):
            log=[]
            if(emotion["dominant_emotion"] != "happy" and emotion["dominant_emotion"] != "neutral"):
                log.append(emotion["dominant_emotion"])
                log.insert(0,count)
                emotion_log_list.append(log)    
        emotion_list.append(emlist)
        count += 1
    # if(count == 10):
    #     vidcap.release()
    #     cv2.destroyAllWindows()
    #     break
    if(ret==False):
        vidcap.release()
        cv2.destroyAllWindows()
        break


#테스트
toCSV(emotion_list,"username")
make_graph()

#json data 만들기
from collections import OrderedDict

file_data=OrderedDict()
file_data["loglist"]=emotion_log_list
with open(testurl+'test.json','w',encoding="utf-8") as make_file:
    json.dump(file_data, make_file, ensure_ascii= False, indent="\t")



#날짜 
# from datetime import datetime
# now = datetime.now()
# formatted_date = now.strftime('%Y-%m-%d %H:%M:%S')

#데이터 베이스에 넣기
# import pymysql
# MySQL Connection 연결
# conn = pymysql.connect(host='localhost', user='root', password='root',
#                        db='bridge', charset='utf8')
# Connection 으로부터 Cursor 생성
# curs = conn.cursor()
# SQL문 실행
# sql = "insert into file_manage(uid,r_num,f_originname,f_datetime,f_type,f_URL) values(%s,%s,%s,%s,%s,%s)"
# curs.execute(sql,(uid,videoname,formatted_date,tmp,tmp,jsonurl))
# conn.commit()
# 데이타 Fetch
# conn.close()
